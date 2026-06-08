import { ChevronLeft, ChevronRight } from "lucide-react";

function Pagination({ pagination, onPageChange }) {
  const handleClickPage = (e, page) => {
    e.preventDefault();
    onPageChange(page);
  };

  return (
    <nav aria-label="Page navigation">
      <ul className="pagination justify-content-center">
        <li className={`page-item ${!pagination.has_pre ? "disabled" : ""}`}>
          <a
            className="page-link"
            href="#"
            aria-label="Previous"
            tabIndex={!pagination.has_pre ? "-1" : undefined}
            onClick={(e) => handleClickPage(e, pagination.current_page - 1)}
          >
            <ChevronLeft size={24} />
          </a>
        </li>
        {
          Array.from({length: pagination.total_pages} , (_, index) => (
            <li key={`${index}_page`}
              className={`page-item ${pagination.current_page === index + 1 && "active"}`}>
              <a
                className="page-link"
                href="#"
                onClick={(e) => handleClickPage(e, index + 1)}
              >
                {index + 1}
              </a>
            </li>
          ))
        }
        <li className={`page-item ${!pagination.has_next ? "disabled" : ""}`}>
          <a
            className="page-link"
            href="#"
            aria-label="Next"
            tabIndex={!pagination.has_next ? "-1" : undefined}
            onClick={(e) => handleClickPage(e, pagination.current_page + 1)}
          >
            <ChevronRight size={24} />
          </a>
        </li>
      </ul>
    </nav>
  )
}

export default Pagination;